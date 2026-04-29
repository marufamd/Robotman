import { FormApi } from './node_modules/@tanstack/form-core/dist/esm/FormApi.js';
import { z } from './node_modules/zod/lib/index.mjs';

const schema = z.object({ prefix: z.string().max(15) });
const form = new FormApi({
  defaultValues: { prefix: '!' },
  validators: { onChange: schema },
});
form.mount();
form.setFieldValue('prefix', 'this-prefix-is-way-too-long');
await form.validate('change');
const fieldMeta = form.getFieldMeta('prefix');
console.log('field errors:', JSON.stringify(fieldMeta?.errors));
console.log('form errorMap:', JSON.stringify(form.state.errorMap));
