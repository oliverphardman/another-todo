variable "region" {
  type    = string
  default = "eu-west-2"
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

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "throttle_burst_limit" {
  type    = number
  default = 50
}

variable "throttle_rate_limit" {
  type    = number
  default = 25
}
