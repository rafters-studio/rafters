# Classic ML floor: python3 classic.py. Labels map to why / not-why.
import json, pickle, sys
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline, make_union
from sklearn.svm import LinearSVC
controls = [c for n in json.load(open('controls.json')) for c in n['clauses']]
test = json.load(open('rafters-labelled.json'))
y = lambda rows: [r['l'] == 'why' for r in rows]
x = lambda rows: [r['t'] for r in rows]
feats = {
  'word': lambda: TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True),
  'char': lambda: TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5), sublinear_tf=True),
  'word+char': lambda: make_union(TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True), TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5), sublinear_tf=True)),
}
clfs = {'logreg': lambda: LogisticRegression(class_weight='balanced', max_iter=2000), 'svm': lambda: LinearSVC(class_weight='balanced')}
def score(truth, pred):
    whys = [p for t, p in zip(truth, pred) if t]; nots = [p for t, p in zip(truth, pred) if not t]
    return dict(acc=round(sum(t == p for t, p in zip(truth, pred)) / len(truth), 3), kept=f'{sum(whys)}/{len(whys)}', removed=f'{sum(not p for p in nots)}/{len(nots)}')
n = len(test); folds = [i * 10 // n for i in range(n)]
for fk, f in feats.items():
    for ck, c in clfs.items():
        m = make_pipeline(f(), c()).fit(x(controls), y(controls))
        a = score(y(test), m.predict(x(test)).tolist())
        pred = [None] * n
        for k in range(10):
            tr = controls + [r for r, g in zip(test, folds) if g != k]
            mk = make_pipeline(f(), c()).fit(x(tr), y(tr))
            for i, g in enumerate(folds):
                if g == k: pred[i] = bool(mk.predict([test[i]['t']])[0])
        b = score(y(test), pred)
        size = len(pickle.dumps(make_pipeline(f(), c()).fit(x(controls + test), y(controls + test))))
        print(json.dumps({'features': fk, 'clf': ck, 'controlsOnly': a, 'bothAuthors': b, 'pickleKB': round(size / 1024)}))
