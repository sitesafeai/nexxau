FROM bluenviron/mediamtx:latest
# curl is not in the base image; add it so runOnReady/runOnNotReady hooks can fire
USER root
RUN apk add --no-cache curl
COPY mediamtx.yml /mediamtx.yml
