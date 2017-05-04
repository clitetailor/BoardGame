import { BoardGamePage } from './app.po';

describe('board-game App', () => {
  let page: BoardGamePage;

  beforeEach(() => {
    page = new BoardGamePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
