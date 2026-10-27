import pandas as pd
import pytest
from backend.data_loader import load_dataset, create_splits

def test_cleaning_and_columns(tmp_path):
    p=tmp_path/'x.csv'; pd.DataFrame({'instruction':[' hi  there ','','hi  there','ok'],'intent':['a','b','a','c'],'category':['A','B','A','C'],'response':['x']*4,'flags':['z']*4}).to_csv(p,index=False)
    df,summary=load_dataset(p)
    assert df.instruction.tolist()==['hi there','ok']
    assert summary['removed_duplicate_text']==1
    assert summary['excluded_columns']==['response','flags']

def test_schema_validation(tmp_path):
    p=tmp_path/'bad.csv';pd.DataFrame({'text':['a'],'intent':['x']}).to_csv(p,index=False)
    with pytest.raises(ValueError,match='missing required columns'):load_dataset(p)

def test_splits_disjoint():
    df=pd.DataFrame([{'instruction':f'msg {i}','intent':f'c{i%3}','category':'X'} for i in range(60)])
    a,b,c=create_splits(df)
    assert len(a)+len(b)+len(c)==60
    assert not set(a.instruction)&set(b.instruction)
