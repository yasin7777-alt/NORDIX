import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function reviseLessonNavigation(work) {
  const edit = (path, transform) => {
    const file = join(work, path), old = readFileSync(file, 'utf8');
    const next = transform(old);
    if (old === next) throw new Error('Lesson navigation patch unchanged: ' + path);
    writeFileSync(file, next);
  };
  const rep = (s, a, b) => {
    if (!s.includes(a)) throw new Error('Lesson navigation anchor missing: ' + a);
    return s.replace(a,b);
  };
  edit('src/pages/Lesson.tsx', s => {
    s=rep(s,"import { Link, Navigate, useNavigate, useParams }", "import { Navigate, useNavigate, useParams }");
    s=rep(s,"ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft", "ArrowLeft, ArrowRight, ChevronLeft");
    s=rep(s,"  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);", "  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);\n  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);\n  const goToStage = (next: StageId) => { setStage(next); window.scrollTo({top:0}); };");
    s=rep(s,"    setQuizResult(null);\n    window.scrollTo({ top: 0 });","    setQuizResult(null);\n    setQuizAnswers([]);\n    window.scrollTo({ top: 0 });");
    s=rep(s,"  const prevLesson = index > 0 ? lessons[index - 1] : null;\n","");
    s=rep(s,"  const isCompleted = completedIds.includes(lesson.id);","  const answers = lesson.quiz.map((_,i) => quizAnswers[i] ?? null);\n  const allAnswered = answers.every(answer => answer !== null);\n  const stages: StageId[] = ['theory','video','practice','quiz','result'];\n  const labels: Record<StageId,string> = {theory:'Теория',video:'Видео',practice:'Практика',quiz:'Викторина',result:'Результат'};\n  const stageIndex = stages.indexOf(stage);");
    s=rep(s,"    setQuizResult(result);\n    setStage('result');","    if (result.passed) completeLesson(course.id, lesson.id);\n    setQuizResult(result);\n    goToStage('result');");
    s=rep(s,"onSelect={setStage}","onSelect={goToStage}");
    s=rep(s,"<QuizStage key={lesson.id} questions={lesson.quiz} onSubmit={submitQuiz} />","<QuizStage key={lesson.id} questions={lesson.quiz} answers={answers} onChange={setQuizAnswers} />");
    s=rep(s,"                  setStage('quiz');","                  setQuizAnswers([]);\n                  goToStage('quiz');");
    s=rep(s,"onNext={nextLesson ? () => navigate(`/learn/${course.id}/${nextLesson.id}`) : null}","onNext={null}");
    const start=s.indexOf('          {/* нижняя навигация урока */}'),end=s.indexOf('\n        </main>',start);
    if(start<0||end<0) throw new Error('Lesson footer missing');
    const controls=[
      '          {/* Sequential lesson navigation; the result is generated from real answers. */}',
      '          <div className="mt-8 flex flex-wrap items-center justify-between gap-3" data-testid="lesson-stage-navigation">',
      '            {stageIndex > 0 ? (',
      '              <button type="button" onClick={() => goToStage(stages[stageIndex-1])} className="group flex items-center gap-3 rounded-2xl border border-line bg-coal px-5 py-4 text-left transition-all duration-200 hover:border-accent">',
      '                <ArrowLeft className="h-5 w-5 shrink-0 text-fog" />',
      '                <span><span className="block text-xs font-bold uppercase tracking-wider text-fog">Предыдущий этап</span><span className="block text-sm font-bold text-silver">{labels[stages[stageIndex-1]]}</span></span>',
      '              </button>',
      '            ) : <span />}',
      '            {stage !== "result" ? (',
      '              <button data-testid="lesson-next-stage" type="button" disabled={stage === "quiz" && !allAnswered} onClick={() => stage === "quiz" ? submitQuiz(answers) : goToStage(stages[stageIndex+1])} className="group ml-auto flex items-center justify-end gap-3 rounded-2xl border border-line bg-coal px-5 py-4 text-right transition-all duration-200 hover:border-accent disabled:cursor-not-allowed disabled:opacity-40">',
      '                <span><span className="block text-xs font-bold uppercase tracking-wider text-fog">Следующий этап</span><span className="block text-sm font-bold text-silver">{stage === "quiz" ? "Увидеть результат" : labels[stages[stageIndex+1]]}</span></span>',
      '                <ArrowRight className="h-5 w-5 shrink-0 text-fog transition-colors group-hover:text-accent-soft" />',
      '              </button>',
      '            ) : quizResult?.passed ? (',
      '              <button data-testid="lesson-next-stage" type="button" onClick={() => navigate(nextLesson ? "/learn/"+course.id+"/"+nextLesson.id : "/progress")} className="group ml-auto flex items-center justify-end gap-3 rounded-2xl border border-line bg-coal px-5 py-4 text-right transition-all duration-200 hover:border-accent">',
      '                <span><span className="block text-xs font-bold uppercase tracking-wider text-fog">{nextLesson ? "Следующий урок" : "Курс завершён"}</span><span className="block text-sm font-bold text-silver">{nextLesson ? nextLesson.title : "Мой прогресс"}</span></span>',
      '                <ArrowRight className="h-5 w-5 shrink-0 text-fog" />',
      '              </button>',
      '            ) : null}',
      '          </div>'
    ].join('\n');
    return s.slice(0,start)+controls+s.slice(end);
  });
  edit('src/components/lesson/QuizStage.tsx', s=>{
    s=rep(s,"import { useState } from 'react';\nimport { Send } from 'lucide-react';\n","");
    s=rep(s,"  onSubmit: (answers: (number | null)[]) => void;","  answers: (number | null)[];\n  onChange: (answers: (number | null)[]) => void;");
    s=rep(s,"export function QuizStage({ questions, onSubmit }: QuizStageProps) {\n  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));","export function QuizStage({ questions, answers, onChange }: QuizStageProps) {");
    s=rep(s,"onChange={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}","onChange={() => onChange(answers.map((a, i) => (i === qi ? oi : a)))}");
    const start=s.indexOf('      <button\n'), end=s.indexOf('      {!allAnswered',start);
    if(start<0||end<0)throw new Error('Quiz submit button not found');
    s=s.slice(0,start)+s.slice(end);
    s=rep(s,"Ответьте на все вопросы и отправьте викторину.","Ответьте на все вопросы и нажмите «Увидеть результат».");
    return s;
  });
}
