import os

import fdb

# Connection parameters
host = "localhost"
port = 3050
database = "/firebird/data/atrium_mvp.fdb"
user = "SYSDBA"
password = "masterkey"

# Connect to the database
con = fdb.connect(host=host, database=database, user=user, password=password, port=port)

# Read and execute seed.sql
seed_file = os.path.join(os.path.dirname(__file__), "seed.sql")
with open(seed_file, "r") as f:
    sql_script = f.read()

# Split the script into individual statements (assuming ; as separator)
statements = [stmt.strip() for stmt in sql_script.split(";") if stmt.strip()]

# Execute each statement
for stmt in statements:
    if stmt:
        try:
            con.execute_immediate(stmt)
            con.commit()
            print(f"Executed: {stmt[:50]}...")
        except Exception as e:
            print(f"Error executing: {stmt[:50]}... - {e}")

# Commit and close
con.commit()
con.close()

print("Database seeded successfully.")
