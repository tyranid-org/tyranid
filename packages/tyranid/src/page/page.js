import Tyr from '../tyr';

/*

  editing

  /. documentation

  /. tests

  /. preview page option

  /. future

     /. markdown support

     /. better editors for pages (i.e. markdown, slate?, etc.)

  two use cases

  1. Using pages from inside React content

     <TyrForm>
       <TyrPage path="create-plan-step-1">
       <Footer>...</Footer>
     </TyrForm>



  2. Embedding React content inside Pages

     <TyrPageHeader>
     </TyrPageHeader>
     <body>
       <TyrNavigation/>

       <div class="whatever"/>

       <TyrPage path="whatever"/>

       put your custom content here

       <TyrButton>...</TyrButton>
     </body>




  <TyrNav>
    <TyrForm>


      <TyrModal>

        <TyrPage>

          <TyrString>


    <TyrForm>

 */

const Page = new Tyr.Collection({
  id: '_p0',
  name: 'tyrPage',
  label: 'Page',
  internal: true,
  express: { rest: true },
  fields: {
    _id: { is: 'mongoid' },
    path: { is: 'string' },
    content: { is: 'markup' },
    fragment: { is: 'boolean' }
  }
});

export default Page;
