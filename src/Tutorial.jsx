import { TUTORIAL_STEPS } from './tutorial.js';

export default function Tutorial({step,onNext,onSkip}){
  const current=TUTORIAL_STEPS[step];
  if(!current)return null;
  const last=step===TUTORIAL_STEPS.length-1;
  return <div className="tour-overlay" role="dialog" aria-modal="true"
    aria-label="Spieleinführung" data-testid="tutorial">
    <div className="tour-top"><span>FAHRE EIN MURAT · EINFÜHRUNG</span>
      <button type="button" onClick={onSkip} aria-label="Einführung überspringen">ÜBERSPRINGEN ✕</button>
    </div>
    <section className="tour-panel">
      <div className="tour-step-label">{current.eyebrow} · {step+1} / {TUTORIAL_STEPS.length}</div>
      <h2>{current.title}</h2>
      <p>{current.description}</p>
      <div className="tour-bottom">
        <div className="tour-dots" aria-label={'Schritt '+(step+1)+' von '+TUTORIAL_STEPS.length}>
          {TUTORIAL_STEPS.map((s,i)=><span key={s.id} className={i===step?'active':''}/>)}
        </div>
        <button type="button" onClick={onNext} className="tour-next">
          {last?'LOSFAHREN →':'WEITER →'}
        </button>
      </div>
    </section>
  </div>;
}
