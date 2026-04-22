from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class MockEzShareHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        
        if self.path.endswith('.JPG'):
            self.send_header("Content-type", "image/jpeg")
            filename = self.path.split('/')[-1]
            self.send_header("Content-Disposition", f"attachment; filename={filename}")
            self.end_headers()
            
            self.wfile.write(b'\xff\xd8\xff\xd9') 
            print(f"-> [다운로드 요청 수신] {filename} 전송 완료.")
            
        else:
            self.send_header("Content-type", "text/html")
            self.end_headers()
            html_content = """
            <html><body>
                <a href="ezsync_DSCF0001.RAF">ezsync_DSCF0001.RAF</a><br>
                <a href="ezsync_DSCF0001.JPG">ezsync_DSCF0001.JPG</a><br>
                <a href="ezsync_DSCF0002.RAF">ezsync_DSCF0002.RAF</a><br>
                <a href="ezsync_DSCF0002.JPG">ezsync_DSCF0002.JPG</a><br>
            </body></html>
            """
            self.wfile.write(html_content.encode("utf-8"))
            print(f"-> [HTML 스캔 요청 수신] {self.path}")

if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8080), MockEzShareHandler)
    print("Mock ezShare Server running on http://127.0.0.1:8080 (Multi-threaded)")
    server.serve_forever()