resource "aws_dynamodb_table" "connections" {
  name         = "${local.name}-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ownerId"
  range_key    = "id"

  attribute {
    name = "ownerId"
    type = "S"
  }

  attribute {
    name = "id"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }
}

data "archive_file" "websocket" {
  type        = "zip"
  source_file = "${path.module}/../apps/api/dist/websocket.mjs"
  output_path = "${path.module}/.build/websocket.zip"
}

resource "aws_iam_role" "websocket" {
  name = "${local.name}-websocket"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "websocket_logs" {
  role       = aws_iam_role.websocket.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "websocket_connections" {
  name = "connections-table"
  role = aws_iam_role.websocket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:PutItem"]
      Resource = [aws_dynamodb_table.connections.arn]
    }]
  })
}

resource "aws_lambda_function" "websocket" {
  function_name    = "${local.name}-websocket"
  role             = aws_iam_role.websocket.arn
  runtime          = "nodejs24.x"
  handler          = "websocket.handle"
  filename         = data.archive_file.websocket.output_path
  source_code_hash = data.archive_file.websocket.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      CONNECTIONS_TABLE_NAME = aws_dynamodb_table.connections.name
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID      = aws_cognito_user_pool_client.app.id
      ENFORCED_USERNAME      = var.enforced_username
    }
  }
}

resource "aws_apigatewayv2_api" "websocket" {
  name                       = "${local.name}-websocket"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_integration" "websocket" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.websocket.invoke_arn
}

resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.websocket.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.websocket.id}"
}

resource "aws_apigatewayv2_stage" "websocket" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = var.environment
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }
}

resource "aws_lambda_permission" "websocket" {
  statement_id  = "AllowWebSocketInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.websocket.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

resource "aws_iam_role_policy" "lambda_push" {
  name = "push-to-connections"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "execute-api:ManageConnections"
      Resource = "${aws_apigatewayv2_api.websocket.execution_arn}/${aws_apigatewayv2_stage.websocket.name}/POST/@connections/*"
    }]
  })
}
