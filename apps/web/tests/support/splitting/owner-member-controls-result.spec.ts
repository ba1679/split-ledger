import { test, expect } from '../fixtures.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import { viewBrowserMembers } from './view-members.js';
import {
  assertOwnerMemberControls,
  assertOwnerLifecycleControlsUnavailable,
} from './owner-member-controls-result.js';

test('T184: the real owner directory has no owner lifecycle controls and preserves its owner', async ({
  page,
  world,
}) => {
  await seedBrowserMemberDirectory(page, world);
  await viewBrowserMembers(page, world);
  await assertOwnerMemberControls(page, world);
});

test('T184: owner control inspection accepts absent/disabled entries and rejects enabled entries', async ({
  page,
}) => {
  await page.setContent(
    '<button>停用 Amy</button><button disabled>停用 Alice</button><button disabled>刪除 Alice</button>',
  );
  await assertOwnerLifecycleControlsUnavailable(page);
  await page.setContent('<button aria-label="停用 Alice">停用</button>');
  await expect(assertOwnerLifecycleControlsUnavailable(page)).rejects.toThrow();
  await page.setContent('<a href="#" aria-label="刪除 Alice">刪除</a>');
  await expect(assertOwnerLifecycleControlsUnavailable(page)).rejects.toThrow();
});
