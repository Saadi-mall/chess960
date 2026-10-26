FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre-jammy AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends stockfish \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /build/target/backend-*.jar app.jar
EXPOSE 8080
# Size the heap from the container's memory limit, leaving room for Stockfish and the JVM's
# own overhead - free hosts give 512MB, where the JVM's defaults would run out.
# apt puts Stockfish in /usr/games, which isn't on PATH.
ENV STOCKFISH_PATH=/usr/games/stockfish
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -Xss512k"
ENTRYPOINT ["java", "-jar", "app.jar"]
