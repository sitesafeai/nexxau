# Stage 1: pull the statically-compiled mediamtx binary out of the scratch image
FROM bluenviron/mediamtx:latest AS mediamtx-src

# Stage 2: run on Alpine so we can install curl for runOnReady/runOnNotReady hooks
FROM alpine:3.19
RUN apk add --no-cache curl ca-certificates tzdata
COPY --from=mediamtx-src /mediamtx /mediamtx
COPY mediamtx.yml /mediamtx.yml
ENTRYPOINT ["/mediamtx"]
CMD ["/mediamtx.yml"]
