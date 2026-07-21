#!/bin/bash
# Déploie le build sur le bucket Cellar public (espace perso Clever Cloud).
# Prérequis : clever CLI connecté + aws CLI.
set -euo pipefail

ADDON_ID="addon_b0fda3c7-757a-4eb9-885d-04173c2e4dd2"
BUCKET="mega-battles"
ENDPOINT="https://cellar-c2.services.clever-cloud.com"

eval "$(clever addon env "$ADDON_ID" | sed 's/^/export /')"
export AWS_ACCESS_KEY_ID="$CELLAR_ADDON_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$CELLAR_ADDON_KEY_SECRET"
# contournement des checksums CRC du CLI AWS récent (rejetés par Cellar)
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required

npm run build
aws s3 sync dist/ "s3://$BUCKET/" --acl public-read --delete --endpoint-url "$ENDPOINT"
echo "✔ En ligne : https://$BUCKET.cellar-c2.services.clever-cloud.com/index.html"
