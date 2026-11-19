#!/usr/bin/env sh
set -eu

root="$(git rev-parse --show-toplevel)"
bucket="$(terraform -chdir="$root/infra" output -raw web_bucket)"
distribution="$(terraform -chdir="$root/infra" output -raw web_distribution_id)"

pnpm --dir "$root/apps/client" run build

aws s3 sync "$root/apps/client/dist" "s3://$bucket" \
	--delete \
	--exclude "index.html" \
	--cache-control "public,max-age=31536000,immutable"

aws s3 cp "$root/apps/client/dist/index.html" "s3://$bucket/index.html" \
	--cache-control "no-cache"

aws cloudfront create-invalidation --distribution-id "$distribution" --paths "/index.html" "/metadata.json" >/dev/null
echo "Deployed to $(terraform -chdir="$root/infra" output -raw web_url)"
