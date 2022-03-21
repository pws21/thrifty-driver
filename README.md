# Thrifty driver

Exhibition stand for RnD 42

Consists of gamepad wheel and monitor. Visitors should choose toll or free road they goes to.

## Prerequisites

In data folder, which will be mounted to docker container should be file `cases.csv`.
File `driver.db` with SQLite db will be created in the same folder on application startup, if it does not exist yet.
If file already exists then application proceed writing data into it.

Supported browsers: Chrome, Firefox

## Run

```commandline
docker build -t thrifty-driver:0.1 .

docker run -it --rm \
  --name=thrifty-driver \
  -v </abs/path/to/local/host/data>:/app/data \
  -e CASES_PER_PERSON=7 \
  -e MAX_IDLE_TIME=30 \
  -p 8881:8881 \
  thrifty-driver:0.1
```


## Parameters

| Parameter        | Default value | Description                             |
|------------------|---------------|-----------------------------------------|
| CASES_PER_PERSON | 7             | How much cases in a series              | 
| MAX_IDLE_TIME    | 30            | Seconds before reset user_id and series |

Parameters could be overwritten by environment variables