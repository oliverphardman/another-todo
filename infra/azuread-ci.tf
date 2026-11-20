data "azuread_application_published_app_ids" "well_known" {}

resource "azuread_service_principal" "msgraph" {
  count        = var.manage_azure_app ? 1 : 0
  client_id    = data.azuread_application_published_app_ids.well_known.result["MicrosoftGraph"]
  use_existing = true
}

resource "azuread_application" "ci" {
  count            = var.manage_azure_app ? 1 : 0
  display_name     = "Another To Do CI (${var.environment})"
  sign_in_audience = "AzureADMyOrg"

  required_resource_access {
    resource_app_id = data.azuread_application_published_app_ids.well_known.result["MicrosoftGraph"]

    resource_access {
      id   = azuread_service_principal.msgraph[0].app_role_ids["Application.ReadWrite.OwnedBy"]
      type = "Role"
    }

    resource_access {
      id   = azuread_service_principal.msgraph[0].app_role_ids["Application.Read.All"]
      type = "Role"
    }
  }
}

resource "azuread_service_principal" "ci" {
  count     = var.manage_azure_app ? 1 : 0
  client_id = azuread_application.ci[0].client_id
}

resource "azuread_app_role_assignment" "ci_manage_owned_apps" {
  count               = var.manage_azure_app ? 1 : 0
  app_role_id         = azuread_service_principal.msgraph[0].app_role_ids["Application.ReadWrite.OwnedBy"]
  principal_object_id = azuread_service_principal.ci[0].object_id
  resource_object_id  = azuread_service_principal.msgraph[0].object_id
}

resource "azuread_app_role_assignment" "ci_read_apps" {
  count               = var.manage_azure_app ? 1 : 0
  app_role_id         = azuread_service_principal.msgraph[0].app_role_ids["Application.Read.All"]
  principal_object_id = azuread_service_principal.ci[0].object_id
  resource_object_id  = azuread_service_principal.msgraph[0].object_id
}

resource "azuread_application_owner" "ci_owns_cognito_app" {
  count           = var.manage_azure_app ? 1 : 0
  application_id  = azuread_application.cognito[0].id
  owner_object_id = azuread_service_principal.ci[0].object_id
}

resource "azuread_application_federated_identity_credential" "github_main" {
  count          = var.manage_azure_app ? 1 : 0
  application_id = azuread_application.ci[0].id
  display_name   = "github-main"
  description    = "GitHub Actions on the main branch of ${var.github_repository}"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:${var.github_repository}:ref:refs/heads/main"
}
