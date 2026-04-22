/**
 * k6 load test — PZ 5 NFR: P95 < 300 ms pod 50 paralelnih korisnika (PZ 15.7).
 *
 * Pokretanje:
 *   1. Seed DB: npm run seed
 *   2. Start app: npm run build && npm start
 *   3. k6 run tests/perf/50-concurrent.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // ramp up to 10 VUs
    { duration: "1m", target: 50 },    // ramp to 50 VUs (PZ target)
    { duration: "2m", target: 50 },    // sustain 50 VUs for 2 min
    { duration: "30s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<300"],  // PZ NFR
    http_req_failed: ["rate<0.01"],    // manje od 1% neuspeha
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const res1 = http.get(`${BASE}/`);
  check(res1, { "home 200": (r) => r.status === 200 });

  const res2 = http.get(`${BASE}/login`);
  check(res2, { "login 200": (r) => r.status === 200 });

  const res3 = http.get(`${BASE}/api/auth/csrf`);
  check(res3, { "csrf 200": (r) => r.status === 200 });

  const res4 = http.get(`${BASE}/api/auth/providers`);
  check(res4, { "providers 200": (r) => r.status === 200 });

  sleep(1);
}
