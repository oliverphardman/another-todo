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
      id   = azuread_service_principal.msgraph[0].app_role_ids["Application.ReadWrite.All"]
      type = "Role"
    }

    resource_access {
      id   = azuread_service_principal.msgraph[0].app_role_ids["Application.Read.All"]
      type = "Role"
    }

    resource_access {
      id   = azuread_service_principal.msgraph[0].app_role_ids["Directory.Read.All"]
      type = "Role"
    }
  }
}

resource "azuread_service_principal" "ci" {
  count     = var.manage_azure_app ? 1 : 0
  client_id = azuread_application.ci[0].client_id
}

resource "azuread_app_role_assignment" "ci_manage_apps" {
  count               = var.manage_azure_app ? 1 : 0
  app_role_id         = azuread_service_principal.msgraph[0].app_role_ids["Application.ReadWrite.All"]
  principal_object_id = azuread_service_principal.ci[0].object_id
  resource_object_id  = azuread_service_principal.msgraph[0].object_id
}

resource "azuread_app_role_assignment" "ci_read_apps" {
  count               = var.manage_azure_app ? 1 : 0
  app_role_id         = azuread_service_principal.msgraph[0].app_role_ids["Application.Read.All"]
  principal_object_id = azuread_service_principal.ci[0].object_id
  resource_object_id  = azuread_service_principal.msgraph[0].object_id
}

resource "azuread_app_role_assignment" "ci_read_directory" {
  count               = var.manage_azure_app ? 1 : 0
  app_role_id         = azuread_service_principal.msgraph[0].app_role_ids["Directory.Read.All"]
  principal_object_id = azuread_service_principal.ci[0].object_id
  resource_object_id  = azuread_service_principal.msgraph[0].object_id
}

resource "azuread_application_federated_identity_credential" "github_main" {
  count          = var.manage_azure_app ? 1 : 0
  application_id = azuread_application.ci[0].id
  display_name   = "github-${lower(var.github_environment)}"
  description    = "GitHub Actions in the ${var.github_environment} environment of ${var.github_repository}"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "${var.github_oidc_subject_prefix}:environment:${var.github_environment}"
}
