import sys
import msoffcrypto
import io

input_path = sys.argv[1]
output_path = sys.argv[2]
password = sys.argv[3] if len(sys.argv) > 3 else "1234"

with open(input_path, "rb") as f:
    ms = msoffcrypto.OfficeFile(f)
    ms.load_key(password=password)
    decrypted = io.BytesIO()
    ms.decrypt(decrypted)

with open(output_path, "wb") as f:
    f.write(decrypted.getvalue())
