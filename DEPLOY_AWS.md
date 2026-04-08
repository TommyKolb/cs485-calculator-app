# Deploy Calculator to AWS (CLI-first)

This flow keeps your assignment's structure (Lambda + API Gateway REST POST), but uses Infrastructure-as-Code style commands where possible.

## 1) Create the Lambda zip package

From repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\server\lambda\package.ps1
```

This creates `server/lambda/calculate-lambda.zip` containing:
- `index.mjs` (Lambda handler)
- `calculator.js` (your existing calculate logic)

## 2) Create IAM role for Lambda

Set your AWS region/account values:

```powershell
$Region = "us-east-1"
$RoleName = "calculator-lambda-exec-role"
```

Create trust policy:

```powershell
@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@ | Set-Content -Path .\server\lambda\trust-policy.json
```

Create role and attach basic logs policy:

```powershell
aws iam create-role --role-name $RoleName --assume-role-policy-document file://server/lambda/trust-policy.json
aws iam attach-role-policy --role-name $RoleName --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

Get role ARN:

```powershell
$RoleArn = aws iam get-role --role-name $RoleName --query "Role.Arn" --output text
```

## 3) Create Lambda function (`calculate`)

```powershell
aws lambda create-function `
  --function-name calculate `
  --runtime nodejs20.x `
  --handler index.handler `
  --zip-file fileb://server/lambda/calculate-lambda.zip `
  --role $RoleArn `
  --region $Region
```

If function already exists, update code instead:

```powershell
aws lambda update-function-code `
  --function-name calculate `
  --zip-file fileb://server/lambda/calculate-lambda.zip `
  --region $Region
```

## 4) Create API Gateway REST API + POST method

Create API:

```powershell
$ApiId = aws apigateway create-rest-api --name Calculator --region $Region --query "id" --output text
```

Get root resource id:

```powershell
$RootResourceId = aws apigateway get-resources --rest-api-id $ApiId --region $Region --query "items[?path=='/'].id" --output text
```

Create `/CalculatorManager` resource:

```powershell
$ResourceId = aws apigateway create-resource `
  --rest-api-id $ApiId `
  --parent-id $RootResourceId `
  --path-part CalculatorManager `
  --region $Region `
  --query "id" --output text
```

Create POST method:

```powershell
aws apigateway put-method `
  --rest-api-id $ApiId `
  --resource-id $ResourceId `
  --http-method POST `
  --authorization-type NONE `
  --region $Region
```

Get Lambda ARN and wire AWS_PROXY integration:

```powershell
$LambdaArn = aws lambda get-function --function-name calculate --region $Region --query "Configuration.FunctionArn" --output text
$Uri = "arn:aws:apigateway:${Region}:lambda:path/2015-03-31/functions/${LambdaArn}/invocations"

aws apigateway put-integration `
  --rest-api-id $ApiId `
  --resource-id $ResourceId `
  --http-method POST `
  --type AWS_PROXY `
  --integration-http-method POST `
  --uri $Uri `
  --region $Region
```

Allow API Gateway to invoke Lambda:

```powershell
$AccountId = aws sts get-caller-identity --query "Account" --output text
$SourceArn = "arn:aws:execute-api:${Region}:${AccountId}:${ApiId}/*/POST/CalculatorManager"

aws lambda add-permission `
  --function-name calculate `
  --statement-id apigateway-post-calculatormanager `
  --action lambda:InvokeFunction `
  --principal apigateway.amazonaws.com `
  --source-arn $SourceArn `
  --region $Region
```

Deploy to `test` stage:

```powershell
aws apigateway create-deployment --rest-api-id $ApiId --stage-name test --region $Region
```

Invoke URL:

```powershell
$InvokeUrl = "https://${ApiId}.execute-api.${Region}.amazonaws.com/test/CalculatorManager"
$InvokeUrl
```

## 5) Connect frontend to API Gateway URL

Create `client/.env.production`:

```env
VITE_CALCULATOR_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/test/CalculatorManager
```

Your frontend now uses `VITE_CALCULATOR_API_URL` in production, and still defaults to `/api/calculate` for local dev.

## 6) Test end-to-end

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri $InvokeUrl `
  -ContentType "application/json" `
  -Body '{"expression":"(2+3)*4"}'
```

Expected response:

```json
{"result":"20"}
```
