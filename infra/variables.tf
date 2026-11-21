variable "region" {
  type    = string
  default = "us-east-1"
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
  default = "itsanothertodo.app"
}

variable "manage_azure_app" {
  type        = bool
  default     = true
  description = "Create the Microsoft Entra app registration that backs Microsoft sign-in through Cognito"
}

variable "azure_sign_in_audience" {
  type        = string
  default     = "PersonalMicrosoftAccount"
  description = "Who may sign in with Microsoft: PersonalMicrosoftAccount, AzureADMyOrg or AzureADandPersonalMicrosoftAccount"
}

variable "github_repository" {
  type        = string
  default     = "oliverphardman/another-todo"
  description = "owner/name of the repository whose GitHub Actions may deploy"
}

variable "github_oidc_subject_prefix" {
  type        = string
  default     = "repo:oliverphardman@5571446/another-todo@1464163539"
  description = "Subject prefix GitHub puts in its OIDC tokens (this repository uses immutable subjects)"
}

variable "github_environment" {
  type        = string
  default     = "Demo"
  description = "Name of the GitHub environment the deploy workflow runs in; the deploy credentials trust only that environment"
}

variable "enforced_username" {
  type        = string
  default     = "demo"
  description = "When set, the API bypasses authentication and serves every request as this one user (the demo); set it to an empty string to use Cognito sign-in"
}

variable "server_notice" {
  type        = string
  default     = "This is a public demo. Anything you create here will be viewable by others. Check out the source and host this yourself: https://github.com/oliverphardman/another-todo"
  description = "Notice the clients show to everyone using this server"
}
