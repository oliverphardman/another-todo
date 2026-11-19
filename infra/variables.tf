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

variable "cognito_domain_prefix" {
  type    = string
  default = ""
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
  default = "https://login.microsoftonline.com/9188040d-6c67-4c5d-b012-9c1e34e4c8e4/v2.0"
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
  default = 25
}
