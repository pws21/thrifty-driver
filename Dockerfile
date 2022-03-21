FROM python:3.10-alpine

COPY . /app
WORKDIR /app
VOLUME ["/app/data"]

RUN pip install -r requirements.txt

EXPOSE 8881

CMD [ "python", "./main.py" ]