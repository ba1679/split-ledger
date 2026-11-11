import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserReferencedMember } from './referenced-member-fixture.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import {
  assertMemberRenamePayload,
  memberRenameKey,
  observeSingleMemberRename,
  renameBrowserMember,
  renameMemberPhrase,
  type MemberRename,
} from './rename-member.js';

test('T156: rename payload preserves the requested name and rejects changes to identity or status', () => {
  assertMemberRenamePayload({ name: ' bob ' }, ' bob ');
  assertMemberRenamePayload({ name: 'bob' }, ' bob ');
  for (const payload of [
    {},
    { name: 'Bob' },
    { name: ' bob ', id: 'replacement' },
    { name: ' bob ', isActive: true },
  ])
    expect(() => assertMemberRenamePayload(payload, ' bob ')).toThrow();
});

for (const [oldName, newName, expectedStatus] of [
  ['小美', 'Amy', 200],
  ['Amy', ' bob ', 409],
] as const) {
  test(`T156: real UI rename ${oldName} to ${JSON.stringify(newName)} retains its original UUID`, async ({
    page,
    world,
  }) => {
    if (oldName === '小美') await seedBrowserReferencedMember(page, world);
    else await seedBrowserMemberDirectory(page, world);
    const originalId = world.splitting.ids.members.get(oldName);
    await runIsolatedStep(
      {
        phrase: renameMemberPhrase,
        input: { oldName, newName },
        execute: (context, names) =>
          renameBrowserMember(page, context, names.oldName, names.newName),
      },
      world,
    );
    const state = world.get<MemberRename>(memberRenameKey);
    expect(state.memberId).toBe(originalId);
    if (expectedStatus === 409) expect([409, null]).toContain(state.status);
    else expect(state.status).toBe(expectedStatus);
    expect(state.newName).toBe(newName);
    expect(state.writes).toHaveLength(state.status === null ? 0 : 1);
    if (state.status === null) expect(state.response).toBeNull();
  });
}

test('T156: submission observer accepts local accessible conflict without awaiting an absent PATCH', async ({
  page,
}) => {
  // Observer-only DOM harness: this verifies waiting/control flow, not a product UI substitute.
  await page.setContent(`
    <form aria-label="rename">
      <label for="name">同行者名稱</label>
      <input id="name" value=" bob " aria-describedby="name-error">
      <p id="name-error"></p>
      <button type="submit">儲存名稱</button>
    </form>
    <script>
      document.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        const form = event.currentTarget;
        form.dataset.submissions = String(Number(form.dataset.submissions || 0) + 1);
        document.querySelector('input').setAttribute('aria-invalid', 'true');
        document.querySelector('#name-error').textContent = '名稱已使用';
      });
    </script>
  `);
  const form = page.getByRole('form', { name: 'rename' });
  const input = form.getByRole('textbox', { name: '同行者名稱' });
  const writes: MemberRename['writes'] = [];
  const capture = (request: import('@playwright/test').Request) => {
    if (['POST', 'PATCH', 'DELETE'].includes(request.method()))
      writes.push({
        method: request.method(),
        path: new URL(request.url()).pathname,
        body: request.postData(),
      });
  };
  page.on('request', capture);
  try {
    const reply = await observeSingleMemberRename(
      page,
      '/api/trips/trip/members/original',
      form,
      input,
      writes,
    );
    expect(reply).toBeNull();
    expect(writes).toEqual([]);
    await expect(input).toHaveValue(' bob ');
    await expect(form).toHaveAttribute('data-submissions', '1');
  } finally {
    page.off('request', capture);
  }
});
