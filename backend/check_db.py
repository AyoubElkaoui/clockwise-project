import fdb

# Connection parameters
database = "localhost/3050:/firebird/data/atrium_mvp.fdb"
user = "SYSDBA"
password = "masterkey"

# Connect to the database
con = fdb.connect(database=database, user=user, password=password)

# Check AT_TAAK
print("AT_TAAK:")
cur = con.cursor()
cur.execute("SELECT * FROM AT_TAAK")
for row in cur:
    print(row)
print()

# Check AT_WERK
print("AT_WERK:")
cur.execute("SELECT * FROM AT_WERK")
for row in cur:
    print(row)
print()

# Check AT_MEDEW
print("AT_MEDEW:")
cur.execute("SELECT * FROM AT_MEDEW")
for row in cur:
    print(row)
print()

# Close
con.close()
print("Database check completed.")
