#!/bin/sh
# Render all PlantUML diagrams to PNG + SVG.
# Tries, in order:
#   A) Docker            -> official plantuml/plantuml image (no Java needed)
#   B) Java + plantuml.jar -> classic CLI (put plantuml.jar in this directory)
#   C) Kroki server      -> free online renderer via python3 (no install at all)
# Usage: ./render.sh   (run from the uml/ directory)

set -e
cd "$(dirname "$0")"
mkdir -p out

render_docker() {
    echo "Using Docker image plantuml/plantuml ..."
    docker run --rm -v "$PWD":/data plantuml/plantuml -tsvg -o out "/data/$1"
    docker run --rm -v "$PWD":/data plantuml/plantuml -tpng -o out "/data/$1"
}

render_java() {
    echo "Using plantuml.jar ..."
    java -jar plantuml.jar -tsvg -o out "$1"
    java -jar plantuml.jar -tpng -o out "$1"
}

render_kroki() {
    echo "Using Kroki server (free online renderer) ..."
    python3 render_kroki.py "$1"
}

if [ -x "$(command -v docker)" ] && docker info >/dev/null 2>&1; then
    for f in *.puml; do
        echo "Rendering $f ..."
        render_docker "$f"
    done
elif [ -f plantuml.jar ] && [ -x "$(command -v java)" ]; then
    for f in *.puml; do
        echo "Rendering $f ..."
        render_java "$f"
    done
elif [ -x "$(command -v python3)" ]; then
    for f in *.puml; do
        echo "Rendering $f ..."
        render_kroki "$f"
    done
else
    echo "ERROR: no renderer available (need Docker, Java+plantuml.jar, or python3)."
    echo "  - Start Docker, or"
    echo "  - Download plantuml.jar (https://github.com/plantuml/plantuml/releases) into this directory, or"
    echo "  - Install python3, or"
    echo "  - Render online: paste a .puml file at https://www.plantuml.com/plantuml"
    exit 1
fi

echo "Done. Outputs in $(pwd)/out/"
