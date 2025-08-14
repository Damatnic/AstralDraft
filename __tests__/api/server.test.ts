import http from 'http';
import app from '../../backend/server';

describe('Server Lifecycle', () => {
  let server: http.Server;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
  });

  afterAll(async () => {
    await new Promise<void>(resolve => {
        if (server) {
            server.close(() => resolve());
        } else {
            resolve();
        }
    });
  });

  it('should start and stop the server', () => {
    expect(server).toBeDefined();
  });
});