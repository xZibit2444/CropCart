with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the testimonials section start
start_marker = '    <!-- Testimonials -->'
end_marker = '    </section>\n  </main>'

start_idx = content.find(start_marker)
if start_idx != -1:
    # Find the end (the closing </section> before </main>)
    search_from = start_idx
    end_idx = content.find(end_marker, search_from)
    
    if end_idx != -1:
        # Include the closing </section>
        end_idx += len('    </section>')
        
        # Also remove the newline before if it exists
        if start_idx > 0 and content[start_idx - 1] == '\n':
            start_idx -= 1
        
        # Remove the section
        new_content = content[:start_idx] + content[end_idx:]
        
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print('Testimonials section successfully deleted')
    else:
        print('Could not find end marker')
else:
    print('Testimonials section not found')
