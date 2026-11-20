output "api_url" {
  value = "https://${local.api_domain}"
}

output "function_url" {
  value = "https://${aws_lambdaweb_function_endpoint.api.domain_name}"
}

output "mcp_url" {
  value = "https://${local.api_domain}/mcp"
}

output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.app.id
}

output "hosted_ui_domain" {
  value = aws_cognito_user_pool_domain.main.domain
}

output "tasks_table" {
  value = aws_dynamodb_table.tasks.name
}

output "lists_table" {
  value = aws_dynamodb_table.lists.name
}

output "name_servers" {
  value = aws_route53_zone.main.name_servers
}

output "dnssec_ds_record" {
  value = {
    key_tag                    = aws_route53_key_signing_key.main.key_tag
    signing_algorithm_type     = aws_route53_key_signing_key.main.signing_algorithm_type
    digest_algorithm_type      = aws_route53_key_signing_key.main.digest_algorithm_type
    digest_algorithm           = aws_route53_key_signing_key.main.digest_algorithm_mnemonic
    digest_value               = aws_route53_key_signing_key.main.digest_value
    ds_record                  = aws_route53_key_signing_key.main.ds_record
    dnskey_record              = aws_route53_key_signing_key.main.dnskey_record
    public_key                 = aws_route53_key_signing_key.main.public_key
    signing_algorithm_mnemonic = aws_route53_key_signing_key.main.signing_algorithm_mnemonic
  }
}

output "web_bucket" {
  value = aws_s3_bucket.web.id
}

output "web_distribution_id" {
  value = aws_cloudfront_distribution.web.id
}

output "web_url" {
  value = "https://${var.domain_name}"
}

output "photos_bucket" {
  value = aws_s3_bucket.photos.id
}

output "websocket_url" {
  value = "${aws_apigatewayv2_api.websocket.api_endpoint}/${aws_apigatewayv2_stage.websocket.name}"
}

output "connections_table" {
  value = aws_dynamodb_table.connections.name
}

output "azure_tenant_id" {
  value = var.manage_azure_app ? data.azuread_client_config.current[0].tenant_id : ""
}

output "azure_ci_client_id" {
  value = var.manage_azure_app ? azuread_application.ci[0].client_id : ""
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
