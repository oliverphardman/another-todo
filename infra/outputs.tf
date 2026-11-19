output "api_url" {
  value = "https://${aws_lambdaweb_function_endpoint.api.domain_name}"
}

output "mcp_url" {
  value = "https://${aws_lambdaweb_function_endpoint.api.domain_name}/mcp"
}

output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.app.id
}

output "hosted_ui_domain" {
  value = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.region}.amazoncognito.com"
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
