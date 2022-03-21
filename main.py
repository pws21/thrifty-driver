import os
import sqlite3
import flatdict
import csv
from flask import Flask, render_template, jsonify, request

app = Flask(__name__, template_folder=".")

CASES_PER_PERSON = 5
MAX_IDLE_TIME = 30


class DB:
    def __init__(self) -> None:
        self.con = sqlite3.connect('data/driver.db')

    @property
    def connection(self):
        return self.con


def insert_dict(table_name, values, cur):
    columns = ', '.join(values.keys())
    placeholders = ', '.join('?' * len(values))
    sql = 'INSERT INTO %s (%s) VALUES (%s)' % (table_name, columns, placeholders)
    values = [int(x) if isinstance(x, bool) else x for x in values.values()]

    try:
        cur.execute(sql, values)
        print("%s -> OK" % sql)
    except Exception as e:
        print("%s -> %s" % (sql, e))
        raise


@app.route("/")
def root():
    return render_template('index.html')


@app.route("/new_result", methods=["POST"])
def add_result():
    j = request.get_json()
    flat_dict = flatdict.FlatDict(j, delimiter='_')
    db = DB()
    cur = db.con.cursor()
    insert_dict("result", flat_dict, cur)
    db.con.commit()
    return jsonify(success=True)


@app.route("/cases", methods=["GET"])
def get_cases():
    ret = {
        "cases_per_person": CASES_PER_PERSON,
        "max_idle_time": MAX_IDLE_TIME,
        "cases": []
    }
    with open('data/cases.csv', newline='') as csvfile:
        reader = csv.reader(csvfile, delimiter=';', quotechar='"', quoting=csv.QUOTE_NONNUMERIC)
        for row in reader:
            print(row)
            item = {
                "case_id":  row[0],
                "toll": {
                    "distance": row[1],
                    "fare": row[2],
                    "duration": row[3],
                    "fuel": row[4],
                    "discount": row[5]
                },
                "free": {
                    "distance": row[6],
                    "fare": row[7],
                    "duration": row[8],
                    "fuel": row[9]
                }
            }
            ret["cases"].append(item)
    return jsonify(ret)


def main():
    db = DB()
    cur = db.con.cursor()

    # Create table
    # cur.execute("drop table result")
    cur.execute('''CREATE TABLE if not exists result
                (dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
                 user_id text not null, 
                 n integer not null, 
                 choice text not null,
                 case_id integer,
                 toll_distance real,
                 toll_fare real,
                 toll_duration real,
                 toll_fuel real,
                 toll_discount real,
                 free_distance real,
                 free_fare real,
                 free_duration real,
                 free_fuel real
                 )''')
    app.run(host='0.0.0.0', port=8881, debug=False)


if __name__ == "__main__":
    if os.environ.get('CASES_PER_PERSON'):
        CASES_PER_PERSON = int(os.environ.get('CASES_PER_PERSON'))
    if os.environ.get('MAX_IDLE_TIME'):
        MAX_IDLE_TIME = int(os.environ.get('MAX_IDLE_TIME'))
    main()

