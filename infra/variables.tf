variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "callback_urls" {
  type    = list(string)
  default = ["http://localhost:8081/auth/callback"]
}

variable "logout_urls" {
  type    = list(string)
  default = ["http://localhost:8081"]
}

variable "cors_origins" {
  type    = list(string)
  default = ["http://localhost:8081"]
}

variable "google_client_id" {
  type    = string
  default = ""
}

variable "google_client_secret" {
  type      = string
  default   = ""
  sensitive = true
}

variable "microsoft_client_id" {
  type    = string
  default = ""
}

variable "microsoft_client_secret" {
  type      = string
  default   = ""
  sensitive = true
}

variable "microsoft_issuer" {
  type    = string
  default = ""
}

variable "timeout_seconds" {
  type    = number
  default = 30
}

variable "max_concurrency_per_environment" {
  type    = number
  default = 64
}

variable "max_environments" {
  type    = number
  default = 5
}

variable "rate_limit" {
  type    = number
  default = 100
}

variable "domain_name" {
  type    = string
  default = "another-todo.oliverhardman.dev"
}

variable "manage_azure_app" {
  type        = bool
  default     = false
  description = "Create the Microsoft Entra app registration that backs Microsoft sign-in through Cognito"
}

variable "azure_sign_in_audience" {
  type        = string
  default     = "PersonalMicrosoftAccount"
  description = "Who may sign in with Microsoft: PersonalMicrosoftAccount, AzureADMyOrg or AzureADandPersonalMicrosoftAccount"
}
