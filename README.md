# seminarNotesPlugin ![](https://api.travis-ci.org/BuildFire/seminarNotesPlugin.svg)
##Tech Spec Doc

###Technology stack: 
● AngularJS

● BuildFire APIs 

● NodeJS

###1. Control Panel(CP) :
All the changes in control panel will reflect dynamically on widget section . Its further divide into two sections :­ 

●  Content: In section, app owner can manually add an item. They can also search and sort various items added. A list of items added by user is shown . On scroll, the events [lazy load](https://sroze.github.io/ngInfiniteScroll/)  and displayed. Created and publish dates are shown. Clicking on each item name, it opens in edit mode and user can update information.

####Add New Item: 
App owner can add a new item. In add new item there will be again two tabs :

- Item Content  :  [Carousel](https://github.com/BuildFire/sdk/wiki/BuildFire-Carousel-Component) CRUD is provided. Various information related to item is there like title, summary, list image, publish date  etc. App owner can also add description [WYSIWYG](https://github.com/BuildFire/sdk/wiki/How-to-use-the-WYSIWYG-editor) and [dynamic links](https://github.com/BuildFire/sdk/wiki/How-to-use-action-Items). Item title is the only mandatory field. 

- Item Design : Provide option to set background image for particular item.

● Design: 5 different list layouts for items are provided and user can also set item list background image. All changes in design should show real time on widget side.

###2. Widget: 
This section will be customized for each app user. They will see the paginated list of items created by app owner.

There are 4 tabs provided at the bottom :

  1. Items : It is the default view and show a list of all items created by app owner in content section. 

  2. Notes : These are the notes created by app user in widget side. Each app user will see the list notes created only by them and they can edit and delete them also.
  
  3. Bookmarks : This section will show a list of bookmarked items by app user. User can add and remove item from bookmark list as well.

  4. Search : User can type in some characters and items will start showing up according show the matched string highlighted and the result filters out as we type more.
  

Clicking on each item in items list page will open a detail view of that item. In the image below, we can see an item which is bookmarked.

###Datastore Schema : 

There will be two tags named **“seminarInfo”** and **“seminarItems”** with following schema­

tag: **seminarInfo**

       {

            "content":{

            "design":{

            “carouselImages”:“”,

            “description”:“”,

            “sortBy” :“”

        },

            "itemListLayout":"",

            "itemListBgImage":""

        }

      }
  
tag: **seminarItems**

        {

          “title”:“”,

          “summary”:“”,

          “listImage”:“”,

          “createdOn”:“”,

          “publishedOn”:“”,

          “links”:[],

          “description”:“”,

          “images”:[],

          “rank”:“”

        }
        
###UserData Schema :

tag:**seminarNotes**

        {

          “itemId”:“”,

          “title”:“”,

          “content”:“”,

          “createdOn”:“”

        }

tag:**seminarBookmarks**

        {
          “itemIds”:[]
        }

Miscellaneous references:

1. https://github.com/BuildFire/sdk/wiki/How­to­use­Datastore

2. https://github.com/BuildFire/sdk/wiki/User­Data:­Save­user­data­from­the­widget

3. https://github.com/BuildFire/sdk/wiki/BuildFire­Thumbnail­Component

4. https://github.com/BuildFire/sdk/wiki/Spinners

5. https://github.com/BuildFire/sdk/wiki/How­to­use­Messaging­to­sync­your­Control­to­Widget

6. https://github.com/BuildFire/sdk/wiki/How­to­use­Navigation

7. https://github.com/BuildFire/sdk/wiki/Search­Operators
  
