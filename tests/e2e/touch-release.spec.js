import { test, expect } from '@playwright/test';

async function game(page){
  await page.goto('/');
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(page.locator('.scene-host canvas')).toBeVisible({timeout:25000});
  const skip=page.getByRole('button',{name:'Einführung überspringen'});
  if(await skip.isVisible())await skip.click();
  await expect(page.getByTestId('drive-pad')).toBeVisible();
}
async function center(locator){
  const r=await locator.boundingBox();
  expect(r).not.toBeNull();
  return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};
}
async function fakeTouchEnd(page,which,remaining=[]){
  await page.evaluate(({which,remaining})=>{
    const mk=touch=>new Touch({
      identifier:touch.id,target:document.body,
      clientX:touch.x,clientY:touch.y,
      pageX:touch.x,pageY:touch.y,screenX:touch.x,screenY:touch.y
    });
    const active=remaining.map(mk);
    window.dispatchEvent(new TouchEvent('touchend',{
      bubbles:true,cancelable:false,changedTouches:[mk(which)],
      touches:active,targetTouches:active
    }));
  },{which,remaining});
}

test('mobile: lost pointerup is recovered by native touchend, no stuck GAS',async({page,isMobile})=>{
  test.skip(!isMobile,'Mobile touch regression');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await game(page);
  const pad=page.getByTestId('drive-pad');
  const gas=await center(page.getByRole('button',{name:'Gas',exact:true}));
  const cdp=await page.context().newCDPSession(page);
  await page.evaluate(()=>window.__lastTouchId=null);
  await page.evaluate(()=>window.addEventListener('touchstart',e=>{
    window.__lastTouchId=e.changedTouches[0].identifier;
  },{once:true,capture:true}));
  const a={x:gas.x,y:gas.y,id:7};
  try{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
    await expect(pad).toHaveAttribute('data-gas','true');
    const id=await page.evaluate(()=>window.__lastTouchId);
    expect(typeof id).toBe('number');
    // Deliberately NEVER send pointerup. iOS PWA occasionally loses it.
    await fakeTouchEnd(page,{id,x:gas.x,y:gas.y});
    await expect(pad).toHaveAttribute('data-gas','false');
    await expect(pad).toHaveAttribute('data-wheelie','false');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:gas.x,y:gas.y-36,id:7}]});
    await expect(pad).toHaveAttribute('data-gas','false');
  }finally{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp.detach();
  }
  expect(errors).toEqual([]);
});

test('mobile: gas finger ending while steering finger stays down releases only GAS',async({page,isMobile})=>{
  test.skip(!isMobile,'Mobile multitouch regression');
  await game(page);
  const pad=page.getByTestId('drive-pad');
  const gas=await center(page.getByRole('button',{name:'Gas',exact:true}));
  const left=await center(page.getByRole('button',{name:'Links'}));
  const cdp=await page.context().newCDPSession(page);
  const a={...gas,id:1},b={...left,id:2};
  try{
    await page.evaluate(()=>{window.__touches=[];
      window.addEventListener('touchstart',e=>{
        for(const t of e.changedTouches)window.__touches.push({id:t.identifier,x:t.clientX,y:t.clientY});
      },{capture:true});
    });
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
    await expect(pad).toHaveAttribute('data-gas','true');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
    await expect(page.getByRole('button',{name:'Links'})).toHaveClass(/held/);
    const [g,l]=await page.evaluate(()=>window.__touches);
    expect(g.id).not.toBe(l.id);
    await fakeTouchEnd(page,g,[l]);
    await expect(pad).toHaveAttribute('data-gas','false');
    await expect(page.getByRole('button',{name:'Links'})).toHaveClass(/held/);
    await fakeTouchEnd(page,l,[]);
    await expect(page.getByRole('button',{name:'Links'})).not.toHaveClass(/held/);
  }finally{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp.detach();
  }
});

test('global pointerup, page blur and manual reset clear the visual GAS held state',async({page})=>{
  await game(page);
  const pad=page.getByTestId('drive-pad');
  const gas=await center(page.getByRole('button',{name:'Gas',exact:true}));
  await page.evaluate(()=>{
    window.addEventListener('pointerdown',e=>window.__gasPointerId=e.pointerId,{once:true,capture:true});
  });
  await page.mouse.move(gas.x,gas.y);
  await page.mouse.down();
  await expect(pad).toHaveAttribute('data-gas','true');
  await page.evaluate(()=>{
    window.dispatchEvent(new PointerEvent('pointerup',{
      bubbles:true,pointerId:window.__gasPointerId,pointerType:'mouse'
    }));
  });
  await expect(pad).toHaveAttribute('data-gas','false');
  await page.mouse.up();

  await page.mouse.move(gas.x,gas.y);await page.mouse.down();
  await expect(pad).toHaveAttribute('data-gas','true');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(pad).toHaveAttribute('data-gas','false');
  await page.mouse.up();

  await page.mouse.move(gas.x,gas.y);await page.mouse.down();
  await expect(pad).toHaveAttribute('data-gas','true');
  // Fire reset from the HUD while pointer capture is intentionally still held
  // by GAS. Playwright mouse clicks would otherwise be retargeted to the pad.
  await page.evaluate(()=>document.querySelector('button[aria-label="Zurücksetzen"]').click());
  await expect(pad).toHaveAttribute('data-gas','false');
  await page.mouse.up();
});
