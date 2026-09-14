// Real generated-content handler; synthetic rows and strictly isolated storage.
import { createApiStore } from './calendar-review-api.mjs';

const store = await createApiStore(JSON.parse(process.env.HOUSE_TRANSIT_TEST_ROWS));
process.on('message', async ({ id, method, body, url }) => {
  try {
    const result = method === 'rows' ? [...store.rows.values()] : await store.invoke(method, body, url);
    process.send({ id, result });
  } catch (error) { process.send({ id, error: String(error) }); }
});
process.send({ ready: true });
