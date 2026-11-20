data "azuread_client_config" "current" {
  count = var.manage_azure_app ? 1 : 0
}

locals {
  azure_idp_response_urls = [
    "https://${local.auth_domain}/oauth2/idpresponse",
  ]
  azure_issuer = var.azure_sign_in_audience == "PersonalMicrosoftAccount" ? "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0" : (var.manage_azure_app ? "https://login.microsoftonline.com/${data.azuread_client_config.current[0].tenant_id}/v2.0" : "")
}

resource "azuread_application" "cognito" {
  count            = var.manage_azure_app ? 1 : 0
  display_name     = "Another To Do (${var.environment})"
  sign_in_audience = var.azure_sign_in_audience
  logo_image       = filebase64("${path.module}/../apps/client/public/icon-512.png")

  api {
    requested_access_token_version = 2
  }

  web {
    redirect_uris = local.azure_idp_response_urls
  }

  single_page_application {
    redirect_uris = [
      "${local.web_origin}/auth/microsoft",
      "http://localhost:8081/auth/microsoft",
    ]
  }

  public_client {
    redirect_uris = ["anothertodo://auth/microsoft"]
  }

  required_resource_access {
    resource_app_id = data.azuread_application_published_app_ids.well_known.result["MicrosoftGraph"]

    resource_access {
      id   = azuread_service_principal.msgraph[0].oauth2_permission_scope_ids["Tasks.ReadWrite"]
      type = "Scope"
    }

    resource_access {
      id   = azuread_service_principal.msgraph[0].oauth2_permission_scope_ids["offline_access"]
      type = "Scope"
    }

    resource_access {
      id   = azuread_service_principal.msgraph[0].oauth2_permission_scope_ids["openid"]
      type = "Scope"
    }
  }

  optional_claims {
    id_token {
      name = "email"
    }
  }
}

resource "azuread_application_password" "cognito" {
  count             = var.manage_azure_app ? 1 : 0
  application_id    = azuread_application.cognito[0].id
  display_name      = "cognito-${var.environment}"
  end_date_relative = "17520h"
}
