import fdb

# Connection parameters
host = "localhost"
port = 3050
database = "/firebird/data/atrium_mvp.fdb"
user = "SYSDBA"
password = "masterkey"

# Create the database on the Firebird 3.0 server
dsn = f"{host}:{port}:{database}"
con = fdb.create_database(
    f"CREATE DATABASE '{dsn}' USER '{user}' PASSWORD '{password}'"
)

# Close the connection
con.close()

print("Database created successfully.")
