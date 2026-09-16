# AddisMap GTFS Dataset

This directory contains the raw static GTFS feed files for public transit in Addis Ababa, Ethiopia:
- `agency.txt`
- `routes.txt`
- `stops.txt`
- `trips.txt`
- `stop_times.txt`
- `shapes.txt`

## How to download/update raw GTFS files:

Run the following command in the project root:
```bash
mkdir -p data/gtfs && \
curl -s https://raw.githubusercontent.com/AddisMap/AddisMapTransit-gtfs/master/routes.txt -o data/gtfs/routes.txt && \
curl -s https://raw.githubusercontent.com/AddisMap/AddisMapTransit-gtfs/master/stops.txt -o data/gtfs/stops.txt && \
curl -s https://raw.githubusercontent.com/AddisMap/AddisMapTransit-gtfs/master/trips.txt -o data/gtfs/trips.txt && \
curl -s https://raw.githubusercontent.com/AddisMap/AddisMapTransit-gtfs/master/stop_times.txt -o data/gtfs/stop_times.txt && \
curl -s https://raw.githubusercontent.com/AddisMap/AddisMapTransit-gtfs/master/shapes.txt -o data/gtfs/shapes.txt && \
curl -s https://raw.githubusercontent.com/AddisMap/AddisMapTransit-gtfs/master/agency.txt -o data/gtfs/agency.txt
```

Source Repository: [AddisMap/AddisMapTransit-gtfs](https://github.com/AddisMap/AddisMapTransit-gtfs)
License: Open Database License (ODbL)
