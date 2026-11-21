#!/usr/bin/env sh
set -eu

root="$(git rev-parse --show-toplevel)"
bucket="$(terraform -chdir="$root/infra" output -raw web_bucket)"
distribution="$(terraform -chdir="$root/infra" output -raw web_distribution_id)"

pnpm --dir "$root/apps/client" run build

api_url="$(terraform -chdir="$root/infra" output -raw api_url)"
printf 'window.__ATD_CONFIG__ = {"serverUrl":"%s","enforced":true};\n' "$api_url" >"$root/apps/client/dist/runtime-config.js"

aws s3 sync "$root/apps/client/dist" "s3://$bucket" \
	--delete \
	--exclude "index.html" \
	--exclude "runtime-config.js" \
	--cache-control "public,max-age=31536000,immutable"

aws s3 cp "$root/apps/client/dist/index.html" "s3://$bucket/index.html" \
	--cache-control "no-cache"

aws s3 cp "$root/apps/client/dist/runtime-config.js" "s3://$bucket/runtime-config.js" \
	--content-type "application/javascript" \
	--cache-control "no-cache"

aws cloudfront create-invalidation --distribution-id "$distribution" --paths "/index.html" "/runtime-config.js" "/metadata.json" >/dev/null
echo "Deployed to $(terraform -chdir="$root/infra" output -raw web_url)"
