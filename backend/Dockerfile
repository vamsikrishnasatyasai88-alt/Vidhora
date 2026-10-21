FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake g++ make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/ ./backend/

RUN cmake -S backend -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --target vidhora_backend -j2

FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/build/bin/vidhora_backend /app/vidhora_backend

RUN mkdir -p /app/data

EXPOSE 10000

CMD ["sh", "-c", "exec /app/vidhora_backend --host 0.0.0.0 --port ${PORT:-10000} --data /app/data"]
