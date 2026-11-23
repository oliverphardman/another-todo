resource "aws_s3_bucket" "api_logs" {
  count = var.api_logging_enabled ? 1 : 0

  bucket           = "${local.name}-api-logs-${data.aws_caller_identity.current.account_id}-${var.region}-an"
  bucket_namespace = "account-regional"
}

resource "aws_s3_bucket_public_access_block" "api_logs" {
  count = var.api_logging_enabled ? 1 : 0

  bucket                  = aws_s3_bucket.api_logs[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "api_logs" {
  count = var.api_logging_enabled ? 1 : 0

  bucket = aws_s3_bucket.api_logs[0].id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "api_logs" {
  count = var.api_logging_enabled ? 1 : 0

  bucket = aws_s3_bucket.api_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "api_logs" {
  count = var.api_logging_enabled ? 1 : 0

  bucket = aws_s3_bucket.api_logs[0].id

  rule {
    id     = "expire"
    status = "Enabled"

    filter {}

    expiration {
      days = 90
    }
  }
}
