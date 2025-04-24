import path from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { ChatPage } from './pages/chat';

const testSessionFile = path.join(
  __dirname,
  '../playwright/.reasoning/session.json',
);

setup('setup test session', async ({ page }) => {
  const chatPage = new ChatPage(page);
  await chatPage.createNewChat();

  await chatPage.chooseModelFromSelector('chat-model');

  await expect(chatPage.getSelectedModel()).resolves.toEqual('GPT-4.1');

  await page.waitForTimeout(1000);
  await page.context().storageState({ path: testSessionFile });
});
