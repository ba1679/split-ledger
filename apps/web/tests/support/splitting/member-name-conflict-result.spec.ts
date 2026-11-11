import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import { createBrowserMember } from './create-member.js';
import { renameBrowserMember } from './rename-member.js';
import {
  assertAccessibleMemberNameConflict,
  assertMemberNameConflict,
  memberNameConflictPhrase,
} from './member-name-conflict-result.js';

for (const rawName of [' alice ', 'AMY', 'Bob', ' bob '])
  test(`T188: duplicate ${JSON.stringify(rawName)} preserves the member identity and all accounting`, async ({
    page,
    world,
  }) => {
    await seedBrowserMemberDirectory(page, world);
    if (rawName === ' bob ') await renameBrowserMember(page, world, 'Amy', rawName);
    else await createBrowserMember(page, world, rawName);
    await runIsolatedStep(
      {
        phrase: memberNameConflictPhrase,
        input: undefined,
        execute: (context) => assertMemberNameConflict(page, context),
      },
      world,
    );
  });

test('T188: a duplicate error must be field-associated, readable and retain raw input', async ({
  page,
}) => {
  await page.setContent(
    '<form><label for="name">同行者名稱</label><input id="name" value=" alice " aria-invalid="true" aria-describedby="error"><p id="error">名稱已使用</p><button>新增同行者</button></form>',
  );
  await assertAccessibleMemberNameConflict(page, ' alice ');
  await page.locator('input').evaluate((input) => input.removeAttribute('aria-describedby'));
  await expect(assertAccessibleMemberNameConflict(page, ' alice ')).rejects.toThrow();
  await page.locator('input').evaluate((input) => {
    input.setAttribute('aria-errormessage', 'error');
  });
  await assertAccessibleMemberNameConflict(page, ' alice ');
  await expect(assertAccessibleMemberNameConflict(page, 'alice')).rejects.toThrow();
});

test('T188: rename errors are scoped to the submitted form while the create form remains open', async ({
  page,
}) => {
  await page.setContent(
    '<form><label for="create">同行者名稱</label><input id="create" value=""><button>新增同行者</button></form><form><label for="rename">同行者名稱</label><input id="rename" value=" bob " aria-invalid="true" aria-describedby="rename-error"><p id="rename-error">名稱已使用</p><button>儲存名稱</button></form>',
  );
  await assertAccessibleMemberNameConflict(page, ' bob ', 'rename');
  await expect(assertAccessibleMemberNameConflict(page, ' bob ', 'create')).rejects.toThrow();
});
