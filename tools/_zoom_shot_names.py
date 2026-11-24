# Maps tileId|lv -> filename stem
import sys
tile, lv = sys.argv[1], sys.argv[2]
safe = tile.replace("energy-", "").replace("commerce-", "").replace("data-", "").replace("misc-", "")
print(f"zoom-{safe}-L{lv}")
