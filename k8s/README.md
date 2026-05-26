# k8s Secrets Management

## Rules

- **Never commit real secret values** to `secrets.yaml` or any file in this directory.
- `secrets.yaml` is a placeholder template only. All values must be `REPLACE_ME`.
- In CI/CD, use [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) or
  [External Secrets Operator](https://external-secrets.io/) to inject real values at deploy time.

## Populating secrets for a one-off manual deploy

```bash
kubectl create secret generic nexxau-secrets \
  --from-literal=POSTGRES_PASSWORD="..." \
  --from-literal=REDIS_PASSWORD="..." \
  --from-literal=JWT_SECRET="..." \
  --from-literal=JWT_REFRESH_SECRET="..." \
  --from-literal=NEXTAUTH_SECRET="..." \
  --from-literal=SENTRY_DSN="..." \
  --from-literal=GRAFANA_PASSWORD="..." \
  --from-literal=SMTP_PASSWORD="..." \
  --namespace=nexxau
```

## TLS secret

Create the TLS secret out-of-band — never store certificate material in git:

```bash
kubectl create secret tls tls-secret \
  --cert=./tls.crt --key=./tls.key \
  --namespace=nexxau
```
