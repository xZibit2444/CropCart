with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines 1569-1595 in 1-indexed = 1568-1594 in 0-indexed
new_lines = lines[:1568] + lines[1595:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Testimonials deleted successfully')
