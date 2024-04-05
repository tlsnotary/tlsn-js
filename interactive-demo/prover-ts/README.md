TODO

1. Start Verifier
2. Start websocket proxy
3. Start app


Since a web browser doesn't have the ability to make TCP connection, we need to use a websocket proxy server.

To run your own websockify proxy **locally**, run:
```sh
git clone https://github.com/novnc/websockify && cd websockify
./docker/build.sh
docker run -it --rm -p 55688:80 novnc/websockify 80 swapi.dev:443
```