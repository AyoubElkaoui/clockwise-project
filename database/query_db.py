import os

import fdb

# Connection parameters
host = "localhost"
port = 3050
database = os.path.join(os.path.dirname(__file__), "atrium_mvp.fdb")
user = "SYSDBA"
password = "masterkey"

# Connect to the database
con = fdb.connect(host=host, database=database, user=user, password=password, port=port)

# Example queries
print("AT_TAAK:")
cur = con.cursor()
cur.execute("SELECT GC_ID, GC_CODE, GC_OMSCHRIJVING FROM AT_TAAK ORDER BY GC_CODE")
for row in cur:
    print(row)

print("\nAT_WERK:")
cur.execute("SELECT GC_ID, GC_CODE, GC_OMSCHRIJVING FROM AT_WERK ORDER BY GC_CODE")
for row in cur:
    print(row)

print("\nAT_MEDEW:")
cur.execute("SELECT GC_ID, GC_CODE, GC_NAAM, ACTIEF_JN FROM AT_MEDEW ORDER BY GC_CODE")
for row in cur:
    print(row)

print("\nAT_URENPER:")
cur.execute("SELECT GC_ID, GC_CODE, BEGINDATUM, EINDDATUM FROM AT_URENPER")
for row in cur:
    print(row)

# Close
con.close()
print("\nDatabase query completed.")
