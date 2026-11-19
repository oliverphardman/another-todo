terraform {
  required_version = ">= 1.10"

  backend "s3" {
    bucket       = "another-todo-tfstate-469144745165-eu-west-1-an"
    key          = "another-todo/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.72"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
}

provider "aws" {
  region = var.region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  name              = "another-todo-${var.environment}"
  auth_domain       = "auth.${var.domain_name}"
  api_domain        = "api.${var.domain_name}"
  web_origin        = "https://${var.domain_name}"
  callback_urls     = concat(var.callback_urls, ["${local.web_origin}/auth/callback"])
  logout_urls       = concat(var.logout_urls, [local.web_origin])
  cors_origins      = concat(var.cors_origins, [local.web_origin])
  google_enabled    = var.google_client_id != "" && var.google_client_secret != ""
  microsoft_enabled = var.microsoft_client_id != "" && var.microsoft_client_secret != ""
  supported_providers = concat(
    ["COGNITO"],
    local.google_enabled ? ["Google"] : [],
    local.microsoft_enabled ? ["Microsoft"] : [],
  )
}

resource "aws_dynamodb_table" "tasks" {
  name         = "${local.name}-tasks"
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

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

resource "aws_dynamodb_table" "lists" {
  name         = "${local.name}-lists"
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

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

resource "aws_dynamodb_table" "settings" {
  name         = "${local.name}-settings"
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

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

resource "aws_dynamodb_table" "photos" {
  name         = "${local.name}-photos"
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

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

resource "aws_cognito_user_pool" "main" {
  name                     = local.name
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain          = local.auth_domain
  user_pool_id    = aws_cognito_user_pool.main.id
  certificate_arn = aws_acm_certificate_validation.main.certificate_arn

  managed_login_version = 1

  depends_on = [aws_route53_record.web]
}

resource "aws_cognito_identity_provider" "google" {
  count         = local.google_enabled ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

resource "aws_cognito_identity_provider" "microsoft" {
  count         = local.microsoft_enabled ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Microsoft"
  provider_type = "OIDC"

  provider_details = {
    client_id                 = var.microsoft_client_id
    client_secret             = var.microsoft_client_secret
    attributes_request_method = "GET"
    oidc_issuer               = var.microsoft_issuer
    authorize_scopes          = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

resource "aws_cognito_user_pool_client" "app" {
  name                                 = "${local.name}-app"
  user_pool_id                         = aws_cognito_user_pool.main.id
  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = local.callback_urls
  logout_urls                          = local.logout_urls
  supported_identity_providers         = local.supported_providers
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation              = true
  explicit_auth_flows                  = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_ADMIN_USER_PASSWORD_AUTH"]

  depends_on = [
    aws_cognito_identity_provider.google,
    aws_cognito_identity_provider.microsoft,
  ]
}

resource "aws_iam_role" "lambda" {
  name = "${local.name}-api"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_tasks" {
  name = "tasks-table"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
      ]
      Resource = [
        aws_dynamodb_table.tasks.arn,
        aws_dynamodb_table.lists.arn,
        aws_dynamodb_table.settings.arn,
        aws_dynamodb_table.photos.arn,
        aws_dynamodb_table.connections.arn,
      ]
    }]
  })
}

data "aws_caller_identity" "current" {}

data "archive_file" "api" {
  type        = "zip"
  source_file = "${path.module}/../apps/api/dist/index.mjs"
  output_path = "${path.module}/.build/api.zip"
}

resource "aws_s3_bucket" "code" {
  bucket_prefix = "${local.name}-code-"
}

resource "aws_s3_bucket_versioning" "code" {
  bucket = aws_s3_bucket.code.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "code" {
  bucket                  = aws_s3_bucket.code.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "code" {
  bucket = aws_s3_bucket.code.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = ["s3:GetObject", "s3:GetObjectVersion"]
      Resource  = "${aws_s3_bucket.code.arn}/*"
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
      }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.code]
}

resource "aws_s3_object" "api" {
  bucket      = aws_s3_bucket.code.id
  key         = "api/${data.archive_file.api.output_base64sha256}.zip"
  source      = data.archive_file.api.output_path
  source_hash = data.archive_file.api.output_base64sha256

  depends_on = [aws_s3_bucket_versioning.code]
}

resource "aws_lambdaweb_function" "api" {
  function_name = "${local.name}-api"
}

resource "aws_lambdaweb_function_revision" "api" {
  function_name = aws_lambdaweb_function.api.function_name

  build_config {
    code_config {
      s3_object {
        bucket     = aws_s3_object.api.bucket
        key        = aws_s3_object.api.key
        version_id = aws_s3_object.api.version_id
      }
    }

    runtime_config {
      runtime = "nodejs24.x"
    }
  }

  service_config {
    execution_role_arn              = aws_iam_role.lambda.arn
    timeout_seconds                 = var.timeout_seconds
    max_concurrency_per_environment = var.max_concurrency_per_environment

    environment_variables = {
      AWS_LAMBDA_NODEJS_ENTRYPOINT = "index.mjs"
      TABLE_NAME                   = aws_dynamodb_table.tasks.name
      LISTS_TABLE_NAME             = aws_dynamodb_table.lists.name
      SETTINGS_TABLE_NAME          = aws_dynamodb_table.settings.name
      PHOTOS_TABLE_NAME            = aws_dynamodb_table.photos.name
      PHOTOS_BUCKET                = aws_s3_bucket.photos.id
      CONNECTIONS_TABLE_NAME       = aws_dynamodb_table.connections.name
      WEBSOCKET_MANAGEMENT_URL     = "https://${aws_apigatewayv2_api.websocket.id}.execute-api.${var.region}.amazonaws.com/${aws_apigatewayv2_stage.websocket.name}"
      COGNITO_USER_POOL_ID         = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID            = aws_cognito_user_pool_client.app.id
      CORS_ORIGINS                 = join(",", local.cors_origins)
      PUBLIC_API_URL               = "https://${local.api_domain}"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lambdaweb_function_endpoint" "api" {
  function_name        = aws_lambdaweb_function.api.function_name
  endpoint_name        = var.environment
  endpoint_type        = "HomeRegion"
  auth_type            = "ApplicationManaged"
  auto_deployment_mode = "LatestRevision"

  scaling_config {
    max_environments = var.max_environments
  }

  throttle_config {
    rate_limit = var.rate_limit
  }

  depends_on = [aws_lambdaweb_function_revision.api]
}
