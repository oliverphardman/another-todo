variable "github_repository" {
  type    = string
  default = "oliverphardman/another-todo"
}

variable "github_branch" {
  type    = string
  default = "main"
}

variable "project" {
  type    = string
  default = "another-todo"
}

locals {
  account_id  = data.aws_caller_identity.current.account_id
  github_role = "${var.project}-github-deploy"
  role_arn    = "arn:aws:iam::${local.account_id}:role/${var.project}-*"
  bucket_arns = [
    "arn:aws:s3:::${var.project}-*",
    "arn:aws:s3:::${var.project}-*/*",
  ]
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/${var.github_branch}"]
    }
  }
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "Buckets"
    actions   = ["s3:*"]
    resources = local.bucket_arns
  }

  statement {
    sid       = "Tables"
    actions   = ["dynamodb:*"]
    resources = ["arn:aws:dynamodb:*:${local.account_id}:table/${var.project}-*"]
  }

  statement {
    sid = "Roles"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:GetRole",
      "iam:UpdateRole",
      "iam:UpdateAssumeRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:ListRoleTags",
      "iam:PutRolePolicy",
      "iam:GetRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:ListRolePolicies",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListInstanceProfilesForRole",
      "iam:PassRole",
    ]
    resources = [local.role_arn]
  }

  statement {
    sid = "Services"
    actions = [
      "acm:*",
      "apigateway:*",
      "cloudfront:*",
      "cognito-idp:*",
      "kms:*",
      "lambda:*",
      "logs:*",
      "route53:*",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role" "github_deploy" {
  name                 = local.github_role
  assume_role_policy   = data.aws_iam_policy_document.github_trust.json
  max_session_duration = 3600
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
